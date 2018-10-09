#!/usr/bin/env bash

function replaceVariables() {
    input=$1
    output=$2
    variables=()
    for var in $(compgen -e); do
        if [[ $var =~ ^GF_VARIABLES_(.*)_NAME$ ]]; then
            variable="${BASH_REMATCH[1]}"
            value=`printenv GF_VARIABLES_${variable}_VALUE`
            name=`printenv GF_VARIABLES_${variable}_NAME`
            values=`printenv GF_VARIABLES_${variable}_VALUES`
            echo "Setting '$name' to '$value'"

            if [[ -z $values ]]; then
                values=($value)
            else
                IFS=',' read -ra values <<< "$values"
            fi

            for i in ${!values[@]}; do
                v=${values[$i]}
                variables+=("| select(.name == \"$name\").options[$i].value = \"$v\"")
                variables+=("| select(.name == \"$name\").options[$i].text = \"$v\"")
            done

            variables+=("| select(.name == \"$name\").current.value = \"$value\"")
            variables+=("| select(.name == \"$name\").current.text = \"$value\"")
            variables+=("| select(.name == \"$name\").query = \"$value\"")
        fi
    done
    transform=". | .templating.list=[.templating.list[] ${variables[@]}]"
    eval "cat $input | jq '$transform' > $output"
}

input='./dashboards/dev-team.json'
output=`mktemp`

echo "Replacing variables in $input..."
replaceVariables $input $output
mv $output $input
echo "Done!"
