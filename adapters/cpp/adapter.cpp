#include <iostream>
#include <string>
#include <vector>
#include <cctype>

using namespace std;

string getStringValue(const string& json, const string& key)
{
    string search = "\"" + key + "\"";
    size_t keyPos = json.find(search);

    if (keyPos == string::npos)
        return "";

    size_t colonPos = json.find(':', keyPos);
    size_t start = json.find('"', colonPos);
    size_t end = json.find('"', start + 1);

    if (colonPos == string::npos ||
        start == string::npos ||
        end == string::npos)
        return "";

    return json.substr(start + 1, end - start - 1);
}

vector<string> tokenize(const string& input, char separator)
{
    vector<string> tokens;
    string word;

    for (char c : input)
    {
        if (c == separator)
        {
            if (!word.empty())
            {
                tokens.push_back(word);
                word.clear();
            }
        }
        else
        {
            word += c;
        }
    }

    if (!word.empty())
        tokens.push_back(word);

    return tokens;
}

vector<string> tokenizeCamel(const string& input)
{
    vector<string> tokens;
    string word;

    for (char c : input)
    {
        if (isupper(c) && !word.empty())
        {
            tokens.push_back(word);
            word.clear();
        }

        word += tolower(c);
    }

    if (!word.empty())
        tokens.push_back(word);

    return tokens;
}

string capitalize(const string& word)
{
    if (word.empty())
        return "";

    string result = word;
    result[0] = toupper(result[0]);
    return result;
}

string joinTokens(const vector<string>& tokens, const string& style)
{
    if (style == "snake")
    {
        string result;

        for (size_t i = 0; i < tokens.size(); ++i)
        {
            if (i > 0)
                result += "_";

            result += tokens[i];
        }

        return result;
    }

    if (style == "kebab")
    {
        string result;

        for (size_t i = 0; i < tokens.size(); ++i)
        {
            if (i > 0)
                result += "-";

            result += tokens[i];
        }

        return result;
    }

    if (style == "camel")
    {
        string result = tokens[0];

        for (size_t i = 1; i < tokens.size(); ++i)
            result += capitalize(tokens[i]);

        return result;
    }

    if (style == "pascal")
    {
        string result;

        for (const string& token : tokens)
            result += capitalize(token);

        return result;
    }

    return "";
}

string makeResponse(const string& output)
{
    return "{\"output\":\"" + output + "\",\"error\":null}";
}

string handle(const string& json)
{
    string operation = getStringValue(json, "operation");

    if (operation != "convert")
        return "{\"output\":null,\"error\":\"Unsupported operation\"}";

    string input = getStringValue(json, "input");

    if (input.empty())
        return "{\"output\":null,\"error\":\"Input must be a non-empty string.\"}";

    string target = getStringValue(json, "to");

    if (target != "snake" &&
        target != "camel" &&
        target != "pascal" &&
        target != "kebab")
    {
        return "{\"output\":null,\"error\":\"Unsupported target case\"}";
    }

    vector<string> tokens;

    if (input.find('_') != string::npos)
        tokens = tokenize(input, '_');
    else if (input.find('-') != string::npos)
        tokens = tokenize(input, '-');
    else
        tokens = tokenizeCamel(input);

    if (tokens.empty())
        return "{\"output\":null,\"error\":\"Could not tokenize input.\"}";

    string output = joinTokens(tokens, target);

    return makeResponse(output);
}

int main()
{
    string json;
    string line;

    while (getline(cin, line))
        json += line;

    cout << handle(json) << '\n';

    return 0;
}